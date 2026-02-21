import SwiftUI

/// Onboarding flow for Paran.
/// Branding: "Your chart. Your world." hero tagline.
struct OnboardingView: View {
    @EnvironmentObject var profileManager: ProfileManager
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @State private var currentStep: OnboardingStep = .welcome
    @State private var name = ""
    @State private var dateOfBirth = Date()
    @State private var timeOfBirth = Date()
    @State private var birthCity = ""
    @State private var birthLat = ""
    @State private var birthLon = ""

    enum OnboardingStep: Int, CaseIterable {
        case welcome = 0
        case whatItDoes = 1
        case name = 2
        case dateTime = 3
        case location = 4
    }

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                progressBar
                content
                navigationButtons
            }
        }
    }

    // MARK: - Progress

    private var progressBar: some View {
        HStack(spacing: 4) {
            ForEach(OnboardingStep.allCases, id: \.rawValue) { step in
                Capsule()
                    .fill(step.rawValue <= currentStep.rawValue ? ParanTheme.accent : ParanTheme.surface)
                    .frame(height: 3)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 60)
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        switch currentStep {
        case .welcome:
            welcomeSlide
        case .whatItDoes:
            featuresSlide
        case .name:
            nameSlide
        case .dateTime:
            dateTimeSlide
        case .location:
            locationSlide
        }
    }

    private var welcomeSlide: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "globe")
                .font(.system(size: 64))
                .foregroundStyle(ParanTheme.accent)
            Text("Paran")
                .font(.system(size: 44, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)
            Text(ParanTheme.onboardingHero)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(ParanTheme.textSecondary)
            Text(ParanTheme.emotionalHook)
                .font(.system(size: 15))
                .foregroundStyle(ParanTheme.textMuted)
                .italic()
            Spacer()
        }
        .padding(.horizontal, 32)
    }

    private var featuresSlide: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()
            Text("Discover places designed for you")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)

            FeatureRow(icon: "house.fill", color: ParanTheme.warm, title: "Find Where to Live", description: "Cities where your chart energy flows naturally")
            FeatureRow(icon: "airplane", color: ParanTheme.accent, title: "Plan When to Travel", description: "Time-sensitive travel windows based on your transits")
            FeatureRow(icon: "heart.circle.fill", color: ParanTheme.rose, title: "Explore with Friends", description: "Where you and your people thrive together")
            FeatureRow(icon: "sparkles", color: ParanTheme.gold, title: "Follow Your Themes", description: "Love, career, adventure, peace — find what you're looking for")
            Spacer()
        }
        .padding(.horizontal, 32)
    }

    private var nameSlide: some View {
        VStack(spacing: 20) {
            Spacer()
            Text("What's your name?")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)

            TextField("Your name", text: $name)
                .font(.system(size: 18))
                .multilineTextAlignment(.center)
                .padding()
                .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 14))
                .foregroundStyle(ParanTheme.textPrimary)

            Spacer()
        }
        .padding(.horizontal, 32)
    }

    private var dateTimeSlide: some View {
        VStack(spacing: 20) {
            Spacer()
            Text("When were you born?")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)

            Text("The more precise, the better your readings.")
                .font(.system(size: 14))
                .foregroundStyle(ParanTheme.textSecondary)

            DatePicker("Date", selection: $dateOfBirth, displayedComponents: .date)
                .datePickerStyle(.wheel)
                .labelsHidden()
                .tint(ParanTheme.accent)

            DatePicker("Time of Birth", selection: $timeOfBirth, displayedComponents: .hourAndMinute)
                .datePickerStyle(.compact)
                .tint(ParanTheme.accent)

            Spacer()
        }
        .padding(.horizontal, 32)
        .foregroundStyle(ParanTheme.textPrimary)
    }

    private var locationSlide: some View {
        VStack(spacing: 20) {
            Spacer()
            Text("Where were you born?")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)

            TextField("Birth city", text: $birthCity)
                .font(.system(size: 18))
                .multilineTextAlignment(.center)
                .padding()
                .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 14))
                .foregroundStyle(ParanTheme.textPrimary)

            HStack(spacing: 12) {
                TextField("Lat", text: $birthLat)
                    .keyboardType(.decimalPad)
                    .padding()
                    .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                TextField("Lon", text: $birthLon)
                    .keyboardType(.decimalPad)
                    .padding()
                    .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))
            }
            .foregroundStyle(ParanTheme.textPrimary)

            Spacer()
        }
        .padding(.horizontal, 32)
    }

    // MARK: - Navigation

    private var navigationButtons: some View {
        HStack {
            if currentStep.rawValue > 0 {
                Button {
                    withAnimation { goBack() }
                } label: {
                    Text("Back")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(ParanTheme.textSecondary)
                }
            }
            Spacer()
            Button {
                withAnimation { advance() }
            } label: {
                Text(currentStep == .location ? "Get Started" : "Next")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ParanTheme.background)
                    .padding(.horizontal, 32)
                    .padding(.vertical, 14)
                    .background(canAdvance ? ParanTheme.accent : ParanTheme.textMuted, in: Capsule())
            }
            .disabled(!canAdvance)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 40)
    }

    private var canAdvance: Bool {
        switch currentStep {
        case .welcome, .whatItDoes: return true
        case .name: return !name.isEmpty
        case .dateTime: return true
        case .location: return !birthCity.isEmpty
        }
    }

    private func advance() {
        if currentStep == .location {
            completeOnboarding()
        } else if let next = OnboardingStep(rawValue: currentStep.rawValue + 1) {
            currentStep = next
        }
    }

    private func goBack() {
        if let prev = OnboardingStep(rawValue: currentStep.rawValue - 1) {
            currentStep = prev
        }
    }

    private func completeOnboarding() {
        let calendar = Calendar.current
        var components = calendar.dateComponents([.year, .month, .day], from: dateOfBirth)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: timeOfBirth)
        components.hour = timeComponents.hour
        components.minute = timeComponents.minute

        let combined = calendar.date(from: components) ?? dateOfBirth

        let profile = BirthData(
            name: name,
            dateOfBirth: combined,
            latitude: Double(birthLat) ?? 0,
            longitude: Double(birthLon) ?? 0,
            locationName: birthCity
        )
        profileManager.saveProfile(profile)
        hasSeenOnboarding = true
    }
}

struct FeatureRow: View {
    let icon: String
    let color: Color
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 22))
                .foregroundStyle(color)
                .frame(width: 44, height: 44)
                .background(color.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(ParanTheme.textPrimary)
                Text(description)
                    .font(.system(size: 13))
                    .foregroundStyle(ParanTheme.textSecondary)
            }
        }
    }
}
